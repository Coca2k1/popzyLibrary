Popzy.elements = [];

function Popzy(options = {}) {
    if (!options.content && !options.templateId) {
        console.error("You must provide one of 'content' or 'templateId'");
        return;
    }

    if (options.content && options.templateId) {
        options.templateId = null;
        console.warn(
            "Both 'content' and 'templateId' are specified. 'content' will take precedence, and 'templateId' will be ignored."
        );
    }

    this.opt = Object.assign(
        {
            closeMethods: ["button", "overlay", "Escape"],
            destroyOnClose: true,
            cssClass: [],
            enableScrollLock: true,
            scrollLockTarget: () => document.body,
            footer: false,
        },
        options
    );

    if (options.templateId) {
        this.template = document.querySelector(`#${this.opt.templateId}`);

        if (!this.template) {
            console.error(`#${this.opt.templateId} doesn't exist!`);
            return;
        }
    }

    const { closeMethods } = this.opt;
    this._allowBackdropClose = closeMethods.includes("overlay");
    this._allowButtonClose = closeMethods.includes("button");
    this._allowEscapeClose = closeMethods.includes("Escape");

    this._footerButton = [];
    this._handleEscapeKey = this._handleEscapeKey.bind(this);
}

Popzy.prototype._getScrollBarWidth = function () {
    if (this._scrollBarWidth) return this._scrollBarWidth;

    const div = document.createElement("div");

    Object.assign(div.style, {
        position: "absolute",
        top: "-999px",
        overflow: "scroll",
    });

    document.body.append(div);

    this._scrollBarWidth = div.offsetWidth - div.clientWidth;
    document.body.removeChild(div);

    return this._scrollBarWidth;
};

Popzy.prototype._build = function () {
    const contentNode = this.opt.content
        ? document.createElement("div")
        : this.template.content.cloneNode(true);

    // create modal elements

    this._backdrop = document.createElement("div");
    this._backdrop.className = "popzy__backdrop";

    const container = document.createElement("div");
    container.className = "popzy__container";

    this._modalContent = document.createElement("div");
    this._modalContent.className = "popzy__content";

    // Append content and element

    if (this.opt.content) {
        contentNode.innerHTML = this.opt.content;
    }

    this._modalContent.appendChild(contentNode);

    container.append(this._modalContent);

    if (!this.opt.footer) {
        container.style.paddingBottom = "40px";
    }

    // footer
    if (this.opt.footer) {
        this._modalFooter = document.createElement("div");
        this._modalFooter.className = "popzy__footer";

        this._renderFooterContent();
        this._renderFooterButtons();

        container.append(this._modalFooter);
    }

    this._backdrop.append(container);
    document.body.append(this._backdrop);

    if (this._allowButtonClose) {
        // const closeBtn = document.createElement("button");
        // closeBtn.className = "popzy__close";
        // closeBtn.innerHTML = "&times";
        const closeBtn = this._createButton("&times", "popzy__close", () =>
            this.close()
        );
        container.append(closeBtn);

        // closeBtn.onclick = () => this.close();
    }

    // Add more cssClass on container
    this.opt.cssClass.forEach((css) => {
        if (typeof css === "string") {
            container.classList.add(css);
        }
    });
};

Popzy.prototype._renderFooterContent = function () {
    if (this._footerContent && this._modalFooter) {
        this._modalFooter.innerHTML = this._footerContent;
    }
};

// setFooterContent to insert content on footer
Popzy.prototype.setFooterContent = function (html) {
    this._footerContent = html;
    this._renderFooterContent();
};

// add footerButton
Popzy.prototype._createButton = function (title, cssClass, callback) {
    const button = document.createElement("button");
    button.className = cssClass;
    button.innerHTML = title;
    button.onclick = callback;

    return button;
};

Popzy.prototype._renderFooterButtons = function () {
    if (this._modalFooter) {
        this._footerButton.forEach((btn) => {
            this._modalFooter.append(btn);
        });
    }
};

Popzy.prototype.addFooterButton = function (title, cssClass, callback) {
    const button = this._createButton(title, cssClass, callback);

    this._footerButton.push(button);

    this._renderFooterButtons();
};

Popzy.prototype._handleEscapeKey = function (e) {
    const lastModal = Popzy.elements[Popzy.elements.length - 1];
    if (e.key === "Escape" && this === lastModal) {
        this.close();
    }
};

// open modal
Popzy.prototype.open = function () {
    Popzy.elements.push(this);
    if (!this._backdrop) {
        this._build();
    }

    setTimeout(() => {
        this._backdrop.classList.add("popzy--show");
    }, 0);

    // Attack eventListeners
    if (this._allowBackdropClose) {
        this._backdrop.onclick = (e) => {
            if (e.target === this._backdrop) {
                this.close();
            }
        };
    }

    // ESC: after close modal, need to remove listener
    if (this._allowEscapeClose) {
        document.addEventListener("keydown", this._handleEscapeKey);
    }

    // hidden scroll and handle problem about scroll when modal appear/disappear
    if (Popzy.elements.length === 1 && this.opt.enableScrollLock) {
        const target = this.opt.scrollLockTarget();

        const padRightTarget = parseInt(getComputedStyle(target).paddingRight);

        if (this._hasScrollBar(target)) {
            target.style.paddingRight =
                padRightTarget + this._getScrollBarWidth() + "px";
            target.classList.add("popzy--no-scroll");
        }
    }

    // onOpen()
    this._onTransitionEnd(this.opt.onOpen);

    return this._backdrop;
};

Popzy.prototype._onTransitionEnd = function (callback) {
    this._backdrop.ontransitionend = (e) => {
        if (e.propertyName !== "opacity") return;
        if (typeof callback === "function") callback();
    };
};

// close modal: remove element modal
Popzy.prototype.close = function (destroy = this.opt.destroyOnClose) {
    Popzy.elements.pop();
    this._backdrop.classList.remove("popzy--show");

    // when transition end, remove backdrop from DOM
    this._onTransitionEnd(() => {
        if (this._backdrop && destroy) {
            this._backdrop.remove();
            this._backdrop = null;
            this._modalFooter = null;
        }

        if (typeof this.opt.onClose === "function") this.opt.onClose();

        if (this._allowEscapeClose) {
            document.removeEventListener("keydown", this._handleEscapeKey);
        }

        if (!Popzy.elements.length & this.opt.enableScrollLock) {
            const target = this.opt.scrollLockTarget();

            target.classList.remove("popzy--no-scroll");
            target.style.paddingRight = "";
        }
    });
};

this.destroy = function () {
    this.close(true);
};

Popzy.prototype.setContent = function (content) {
    this._content = content;
    if (this._modalContent) {
        this._modalContent.innerHTML = this._content;
    }
};

Popzy.prototype._hasScrollBar = function (target) {
    if ([document.body, document.documentElement].includes(target)) {
        return (
            document.body.scrollHeight > document.body.clientHeight ||
            document.documentElement.scrollHeight >
                document.documentElement.clientHeight
        );
    }
    return target.scrollHeight > target.clientHeight;
};
